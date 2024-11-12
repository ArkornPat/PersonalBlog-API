import { Router } from "express";
import validateDataPost from "../middleware/validationDataPost.mjs";
import { pool } from "../utils/db.mjs";

const postsRouter = Router();


// POST posts
postsRouter.post("/",[validateDataPost], async (req, res) => {
  const newPosts = req.body;
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
postsRouter.get("/:postId", async (req, res) => {
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
postsRouter.put("/:postId",[validateDataPost], async (req, res) => {
  const postId = req.params.postId;
  const updatedPost = { ...req.body, date: new Date() };
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
postsRouter.delete("/:postId", async (req, res) => {
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
postsRouter.get("/", async (req, res) => {
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

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a new post
 *     description: Create a new blog post with title, image, category, description, content, and status.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "New Post"
 *               image:
 *                 type: string
 *                 example: "http://example.com/image.jpg"
 *               category_id:
 *                 type: integer
 *                 example: 1
 *               description:
 *                 type: string
 *                 example: "Description of the new post"
 *               content:
 *                 type: string
 *                 example: "Content of the new post"
 *               status_id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Successfully created a new post
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Created post successfully"
 *       400:
 *         description: Bad request due to validation failure
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /posts/{postId}:
 *   get:
 *     summary: Get a post by ID
 *     description: Retrieve the details of a specific post by its ID.
 *     parameters:
 *       - name: postId
 *         in: path
 *         required: true
 *         description: The ID of the post to retrieve
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Successfully retrieved the post details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 title:
 *                   type: string
 *                   example: "Post Title"
 *                 image:
 *                   type: string
 *                   example: "http://example.com/image.jpg"
 *                 category:
 *                   type: string
 *                   example: "Technology"
 *                 description:
 *                   type: string
 *                   example: "This is the post description"
 *                 content:
 *                   type: string
 *                   example: "This is the content of the post"
 *                 status:
 *                   type: string
 *                   example: "published"
 *                 date:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-11-12T12:34:56Z"
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /posts/{postId}:
 *   put:
 *     summary: Update an existing post
 *     description: Update the details of a post by its ID.
 *     parameters:
 *       - name: postId
 *         in: path
 *         required: true
 *         description: The ID of the post to update
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Updated Post Title"
 *               image:
 *                 type: string
 *                 example: "http://example.com/updated_image.jpg"
 *               category_id:
 *                 type: integer
 *                 example: 2
 *               description:
 *                 type: string
 *                 example: "Updated description of the post"
 *               content:
 *                 type: string
 *                 example: "Updated content of the post"
 *               status_id:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Successfully updated the post
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Updated post successfully"
 *       400:
 *         description: Bad request due to validation failure
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /posts/{postId}:
 *   delete:
 *     summary: Delete a post by ID
 *     description: Delete a specific post by its ID.
 *     parameters:
 *       - name: postId
 *         in: path
 *         required: true
 *         description: The ID of the post to delete
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Successfully deleted the post
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Deleted post successfully"
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: Get all posts
 *     description: Retrieve a paginated list of posts with optional filters for category and keyword.
 *     parameters:
 *       - name: category
 *         in: query
 *         description: Category to filter posts
 *         required: false
 *         schema:
 *           type: string
 *           example: "Technology"
 *       - name: keyword
 *         in: query
 *         description: Keyword to filter posts by title, description, or content
 *         required: false
 *         schema:
 *           type: string
 *           example: "JavaScript"
 *       - name: page
 *         in: query
 *         description: Page number for pagination
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         description: Number of posts per page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 6
 *     responses:
 *       200:
 *         description: Successfully retrieved list of posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPosts:
 *                   type: integer
 *                   example: 50
 *                 totalPages:
 *                   type: integer
 *                   example: 9
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 6
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       image:
 *                         type: string
 *                       category:
 *                         type: string
 *                       status:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       likes_count:
 *                         type: integer
 *       500:
 *         description: Internal server error
 */

export default postsRouter;

