import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

const profileData = {
  name: "john",
  age: 20,
};

//app.method(endpoint_path, callback)
app.get("/profiles", (req, res) => {
  return res.status(200).json({ data: profileData });
});

app.listen(port, () => {
  console.log(`Server is running at ${port}`);
});
