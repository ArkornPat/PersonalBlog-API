import express from "express";
import cors from "cors";
import postsRouter from "./routes/postsRouter.mjs";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const app = express();
const port = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());
//กำหนด ให้ถ้ารับ endpoint มาเป็น /posts ทำงานใน postsRouter
app.use("/posts", postsRouter);

// ข้อมูลตัวอย่าง
const profileData = {
  name: "john",
  age: 20,
};
// GET profiles
app.get("/profiles", (req, res) => {
  return res.status(200).json({ data: profileData });
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
        url: `http://localhost:${port}`,
      },
    ],
  },
  apis: ["./routes/postsRouter.mjs"], 
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use(
  "/swagger",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocs, {
    url: "https://cdn.jsdelivr.net/npm/swagger-ui-dist@3.51.1/swagger-ui-bundle.js", // สำหรับการโหลด Swagger UI
  })
);

app.listen(port, () => {
  console.log(`Server is running at ${port}`);
});
