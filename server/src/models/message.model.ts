import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  thread: mongoose.Schema.Types.ObjectId;
  user: mongoose.Schema.Types.ObjectId;
  sender: "user" | "assistant";
  message: string;
  response?: string;
  messageType: "text" | "image" | "audio" | "file";
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    thread: {
      type: Schema.Types.ObjectId,
      ref: "ChatThread",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    message: { type: String, required: true },
    response: { type: String, default: "Unable to generate response" },
    messageType: {
      type: String,
      enum: ["text", "image", "audio", "file"],
      default: "text",
    },
  },
  { timestamps: true }
);

export const Message =  mongoose.model<IMessage>("Message", MessageSchema);
