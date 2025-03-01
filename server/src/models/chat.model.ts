import mongoose, { Schema, Document } from "mongoose";

export interface IChatThread extends Document {
  title: string;
  user: mongoose.Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChatThreadSchema = new Schema<IChatThread>(
  {
    title: {
      type: String,
      required: true,
      maxlength: 255,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Custom method to return title
ChatThreadSchema.methods.toString = function () {
  return this.title;
};

export const Thread = mongoose.model<IChatThread>("ChatThread", ChatThreadSchema);
