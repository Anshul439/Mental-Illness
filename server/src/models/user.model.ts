import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string
  preferredLanguage: string;
  onboardingComplete: boolean;
  mentalHealthGoals: string[];
  role: "student" | "counselor";
  gender: "male" | "female" | "other";
  createdAt: Date;
  updatedAt: Date;
  dob: Date;
}

// Supported Indian Languages Enum
const IndianLanguagesEnum = [
  "English",
  "Hindi",
  "Bengali",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Marathi",
  "Tamil",
  "Telugu",
  "Urdu",
  "Punjabi",
];

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: {type: String, required: true},
    preferredLanguage: {
      type: String,
      enum: IndianLanguagesEnum,
      default: "English",
    },
    dob: { type: Date, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    onboardingComplete: { type: Boolean, default: false },
    mentalHealthGoals: { type: [String], default: [] },
    role: { type: String, enum: ["student", "counselor"], default: "student" },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);
