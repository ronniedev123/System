const router = require("express").Router();
const authMiddleware = require("../middlewares/authMiddleware");
const controller = require("../controllers/churchAlbumController");

router.get("/", authMiddleware, controller.getImages);
router.post("/", authMiddleware, controller.createImage);
router.delete("/:id", authMiddleware, controller.deleteImage);

module.exports = router;
