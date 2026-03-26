const router = require("express").Router();
const authMiddleware = require("../middlewares/authMiddleware");
const controller = require("../controllers/worshipSongsController");

router.get("/folders", authMiddleware, controller.getFolders);
router.get("/folders/:id", authMiddleware, controller.getFolderById);
router.post("/folders", authMiddleware, controller.createFolder);
router.get("/", authMiddleware, controller.getSongs);
router.post("/", authMiddleware, controller.createSong);
router.delete("/:id", authMiddleware, controller.deleteSong);

module.exports = router;
