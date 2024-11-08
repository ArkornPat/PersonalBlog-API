import express from "express";
import cors from "cors";
import { pool } from "./utils/db.mjs";

const app = express();
const port = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

const profileData = {
  name: "john",
  age: 20,
};

//app.method(endpoint_path, callback)
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

app.listen(port, () => {
  console.log(`Server is running at ${port}`);
});
