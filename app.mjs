import express from "express";
import cors from "cors";
import { pool } from "./utils/db.mjs";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const app = express();
const port = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

// ข้อมูลตัวอย่าง
const profileData = {
  name: "john",
  age: 20,
};
// GET profiles
app.get("/profiles", (req, res) => {
  return res.status(200).json({ data: profileData });
});
// POST posts
app.post("/posts", async (req, res) => {
  const newPosts = req.body;

  if (
    !newPosts.title ||
    !newPosts.image ||
    !newPosts.category_id ||
    !newPosts.description ||
    !newPosts.content ||
    !newPosts.status_id
  ) {
    return res
      .status(400)
      .json({ message: "Bad Request: Missing required fields" });
  }

  try {
    const query = `insert into posts (title, image, category_id, description, content, status_id)
    values ($1, $2, $3, $4, $5, $6)`;
    const values = [
      newPosts.title,
      newPosts.image,
      newPosts.category_id,
      newPosts.description,
      newPosts.content,
      newPosts.status_id,
    ];
    await pool.query(query, values);

    return res.status(201).json({
      message: "Created post successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server could not create post because database connection",
    });
  }
});
// GET post by id
app.get("/posts/:postId", async (req, res) => {
  const postId = req.params.postId;

  try {
    const result = await pool.query(
      `      
      SELECT posts.id, posts.image, categories.name AS category, posts.title, posts.description, posts.date, posts.content, statuses.status, posts.likes_count
      FROM posts
      INNER JOIN categories ON posts.category_id = categories.id
      INNER JOIN statuses ON posts.status_id = statuses.id
      WHERE posts.id = $1`,
      [postId]
    );

    if (!result.rows[0]) {
      return res
        .status(404)
        .json({ message: "Server could not find a requested post" });
    }

    return res.status(200).json(result.rows[0]);
  } catch {
    return res.status(500).json({
      message: "Server could not read post because database connection",
    });
  }
});
//UPDATE post by id
app.put("/posts/:postId", async (req, res) => {
  const postId = req.params.postId;
  const updatedPost = { ...req.body, date: new Date() }
  try {
    const result = await pool.query("select id from posts where id = $1", [
      postId,
    ]);
    if (!result.rows[0]) {
      return res
        .status(404)
        .json({ message: "Server could not find a requested post to update" });
    }

    await pool.query(
      `update posts set title = $2 ,image = $3 , category_id = $4, description = $5, content = $6, status_id = $7, date = $8 where id = $1`,
      [
        postId,
        updatedPost.title,
        updatedPost.image,
        updatedPost.category_id,
        updatedPost.description,
        updatedPost.content,
        updatedPost.status_id,
        updatedPost.date,
      ]
    );
    return res.status(200).json({ message: "Updated post sucessfully" });
  } catch {
    return res.status(500).json({
      message: "Server could not read post because database connection",
    });
  }
});
//DELETE post by id
app.delete("/posts/:postId", async (req, res) => {
  const postId = req.params.postId;
  try {
    const result = await pool.query("select id from posts where id = $1", [
      postId,
    ]);
    if (!result.rows[0]) {
      return res
        .status(404)
        .json({ message: "Server could not find a requested post to delete" });
    }
    await pool.query(`delete from posts where id = $1`, [postId]);
    return res.status(200).json({ message: "Deleted post sucessfully" });
  } catch {
    return res.status(500).json({
      message: "Server could not delete post because database connection",
    });
  }
});
//GET all post || Query Parameter
app.get("/posts", async (req, res) => {
  try {
    // 1) Access ข้อมูลใน Body จาก Request ด้วย req.body
    const category = req.query.category || "";
    const keyword = req.query.keyword || "";
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 6;

    // 2) ทำให้แน่ใจว่า query parameter page และ limit จะมีค่าอย่างต่ำเป็น 1
    //แต่ถ้า page มีค่าน้อยกว่า 1 จะถูกแทนที่ด้วยค่า 1 เสมอ
    const safePage = Math.max(1, page); 
    //กำหนดให้ค่าของ limit ต้องไม่เกิน 100 และ น้อยกว่า 1 จะถูกแทนที่ด้วย 1
    const safeLimit = Math.max(1, Math.min(100, limit)); 
    const offset = (safePage - 1) * safeLimit;
    // offset คือค่าที่ใช้ในการข้ามจำนวนข้อมูลบางส่วนตอน query ข้อมูลจาก database
    // ถ้า page = 2 และ limit = 6 จะได้ offset = (2 - 1) * 6 = 6 หมายความว่าต้องข้ามแถวไป 6 แถวแรก และดึงแถวที่ 7-12 แทน

    // 3) เขียน Query เพื่อ Insert ข้อมูลโพสต์ ด้วย Connection Pool
    let query = `
        SELECT posts.id, posts.image, categories.name AS category, posts.title, posts.description, posts.date, posts.content, statuses.status, posts.likes_count
        FROM posts
        INNER JOIN categories ON posts.category_id = categories.id
        INNER JOIN statuses ON posts.status_id = statuses.id
      `;
    let values = [];

    // 4) เขียน query จากเงื่อนไขของการใส่ query parameter category และ keyword
    if (category && keyword) {
      query += `
          WHERE categories.name ILIKE $1 
          AND (posts.title ILIKE $2 OR posts.description ILIKE $2 OR posts.content ILIKE $2)
        `;
      values = [`%${category}%`, `%${keyword}%`];
    } else if (category) {
      query += " WHERE categories.name ILIKE $1";
      values = [`%${category}%`];
    } else if (keyword) {
      query += `
          WHERE posts.title ILIKE $1 
          OR posts.description ILIKE $1 
          OR posts.content ILIKE $1
        `;
      values = [`%${keyword}%`];
    }

    // 5) เพิ่มการ odering ตามวันที่, limit และ offset
    query += ` ORDER BY posts.date DESC LIMIT $${values.length + 1} OFFSET $${
      values.length + 2
    }`;

    values.push(safeLimit, offset);

    // 6) Execute the main query (ดึงข้อมูลของบทความ)
    const result = await pool.query(query, values);

    // 7) สร้าง Query สำหรับนับจำนวนทั้งหมดตามเงื่อนไข พื่อใช้สำหรับ pagination metadata
    let countQuery = `
        SELECT COUNT(*)
        FROM posts
        INNER JOIN categories ON posts.category_id = categories.id
        INNER JOIN statuses ON posts.status_id = statuses.id
      `;
    let countValues = values.slice(0, -2); // ลบค่า limit และ offset ออกจาก values

    if (category && keyword) {
      countQuery += `
          WHERE categories.name ILIKE $1 
          AND (posts.title ILIKE $2 OR posts.description ILIKE $2 OR posts.content ILIKE $2)
        `;
    } else if (category) {
      countQuery += " WHERE categories.name ILIKE $1";
    } else if (keyword) {
      countQuery += `
          WHERE posts.title ILIKE $1 
          OR posts.description ILIKE $1 
          OR posts.content ILIKE $1
        `;
    }

    const countResult = await pool.query(countQuery, countValues);
    const totalPosts = parseInt(countResult.rows[0].count, 10);

    // 8) สร้าง response พร้อมข้อมูลการแบ่งหน้า (pagination)
    const results = {
      totalPosts,
      totalPages: Math.ceil(totalPosts / safeLimit),
      currentPage: safePage,
      limit: safeLimit,
      posts: result.rows,
    };
    // เช็คว่ามีหน้าถัดไปหรือไม่
    if (offset + safeLimit < totalPosts) {
      results.nextPage = safePage + 1;
    }
    // เช็คว่ามีหน้าก่อนหน้าหรือไม่
    if (offset > 0) {
      results.previousPage = safePage - 1;
    }
    // 9) Return ตัว Response กลับไปหา Client ว่าสร้างสำเร็จ
    return res.status(200).json(results);
  } catch {
    return res.status(500).json({
      message: "Server could not read post because database issue",
    });
  }
});

// การตั้งค่า Swagger
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "BlogPost API",
      version: "1.0.0",
      description: "A simple Express API for BlogPost Project",
    },
    servers: [
      {
        // เช็คสภาพแวดล้อม
        url:
          process.env.NODE_ENV === "production"
            ? "https://personal-blog-api-eight.vercel.app"
            : `http://localhost:${port}`,
      },
    ],
  },
  apis: ["./app.mjs"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use(
  "/swagger",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocs, {
    url: "https://cdn.jsdelivr.net/npm/swagger-ui-dist@3.51.1/swagger-ui-bundle.js",
  })
);

/**
 * @swagger
 * /profiles:
 *   get:
 *     summary: Retrieve profile data
 *     description: Return profile data with name and age.
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     age:
 *                       type: integer
 */

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a new post
 *     description: Create a new post with title, image, category, description, content, and status.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               image:
 *                 type: string
 *               category_id:
 *                 type: integer
 *               description:
 *                 type: string
 *               content:
 *                 type: string
 *               status_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: "Created post successfully"
 *       400:
 *         description: "Bad Request: Missing required fields"
 *       500:
 *         description: "Server could not create post because database connection"
 */

app.listen(port, () => {
  console.log(`Server is running at ${port}`);
});
