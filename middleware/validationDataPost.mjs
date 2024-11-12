function validateDataPost(req, res, next) {
  const { title, image, description, content, category_id, status_id } =
    req.body;
  //เช็ต input
  if (!title) {
    return res.status(400).json({ message: "Title is required" });
  }
  if (!image) {
    return res.status(400).json({ message: "Image is required" });
  }
  if (!description) {
    return res.status(400).json({ message: "Description is required" });
  }
  if (!content) {
    return res.status(400).json({ message: "Content is required" });
  }
  if (!category_id) {
    return res.status(400).json({ message: "Category ID is required" });
  }
  if (!status_id) {
    return res.status(400).json({ message: "Status ID is required" });
  }
  // เช็ค type
  if (typeof title !== "string") {
    return res.status(400).json({ message: "Title must be a string" });
  }
  if (typeof image !== "string") {
    return res.status(400).json({ message: "Image must be a string URL" });
  }
  if (typeof description !== "string") {
    return res.status(400).json({ message: "Description is must be a string" });
  }
  if (typeof content !== "string") {
    return res.status(400).json({ message: "Content is must be a string" });
  }
  if (typeof category_id !== "number") {
    return res.status(400).json({ message: "Category ID must be a number" });
  }
  if (typeof status_id !== "number") {
    return res.status(400).json({ message: "Status ID must be a number" });
  }
  next();
}
export default validateDataPost;
