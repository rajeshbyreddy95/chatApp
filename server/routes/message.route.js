import express from "express";
import { protectRoute } from "../middlewear/auth.middlewear.js";
import User from "../model/user.model.js";
import Message from "../model/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js"; // ✅ import io

const router = express.Router();

router.get("/users", protectRoute, async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.log("Error in /users route", error.message);
    res.status(500).json({ error: "internal server error" });
  }
});
router.get("/conversations", protectRoute, async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      {
        $sort: { createdAt: -1 }, // sort messages by latest first
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", userId] },
              "$receiverId",
              "$senderId",
            ],
          },
          lastMessage: { $first: "$$ROOT" }, // get latest message per user
          unreadCount: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $eq: ["$receiverId", userId] }, 
                    { $eq: ["$isRead", false] } // requires isRead in schema
                  ]
                },
                1,
                0
              ]
            }
          }
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: "$user._id",
          fullname: "$user.fullname",
          email: "$user.email",
          profilepicture: "$user.profilepicture",
          lastMessage: {
            text: "$lastMessage.text",
            image: "$lastMessage.image",
            createdAt: "$lastMessage.createdAt",
          },
          unreadCount: 1,
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } }, // sort conversations by recency
    ]);

    res.json(conversations);
  } catch (err) {
    console.error("Error in /conversations route:", err.message);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});



router.get("/:id", protectRoute, async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const senderId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: senderId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("error in message :/id route ", error.message);
    res.status(500).json({ error: "internal server error" });
  }
});

router.post("/send/:id", protectRoute, async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    // ✅ Emit socket event if receiver is online
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(200).json(newMessage);
  } catch (error) {
    console.error("error in send message route", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



export default router;
