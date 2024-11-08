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
    return res
      .status(500)
      .json({
        message: "Server could not create post because database connection",
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
        url: process.env.NODE_ENV === 'production' 
          ? 'https://personal-blog-api-eight.vercel.app' 
          : `http://localhost:${port}`, 
      },
    ],
  },
  apis: ["./app.mjs"], 
};


const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

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
