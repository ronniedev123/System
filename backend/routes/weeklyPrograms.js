const router = require("express").Router();
const authMiddleware = require("../middlewares/authMiddleware");
const controller = require("../controllers/weeklyProgramsController");

router.get("/", authMiddleware, controller.getPrograms);
router.post("/", authMiddleware, controller.createProgram);
router.put("/:id", authMiddleware, controller.updateProgram);
router.delete("/:id", authMiddleware, controller.deleteProgram);

module.exports = router;
