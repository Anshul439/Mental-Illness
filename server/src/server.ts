import express from "express";
import cors from "cors";
import connectDB from "./config";
import { User } from "./models/user.model";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { Thread } from "./models/chat.model";
import { Message } from "./models/message.model";
import { Readable } from "stream";

import OpenAI from "openai";
import { ElevenLabsClient } from "elevenlabs";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to DB
connectDB();

app.post("/api/signin", async (req, res): Promise<any> => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: "Missing email or password" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare passwords
    const passwordMatch = await bcryptjs.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role }, // Payload
      process.env.JWT_SECRET || "your_secret_key", // Secret key (store in env variables)
      { expiresIn: "1h" } // Token expiration
    );

    // Successful login with JWT
    res.status(200).json({
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        // Add other relevant user data, but exclude password
      },
      token: token, // Send the JWT
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/signup", async (req, res): Promise<any> => {
  try {
    const {
      name,
      email,
      password,
      dob,
      gender,
      preferredLanguage,
      mentalHealthGoals,
    } = req.body;

    // Validation (basic)
    if (!name || !email || !password || !dob || !gender) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash the password
    const hashedPassword = await bcryptjs.hash(password, 10); // 10 is the salt rounds

    // Create the new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      dob: new Date(dob), // Ensure dob is a valid Date object
      gender,
      preferredLanguage: preferredLanguage || "English", // Default to English if not provided
      mentalHealthGoals: mentalHealthGoals || [], // Default to empty array if not provided
    });

    await newUser.save();

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/threads", async (req, res): Promise<any> => {
  const userId = "user_2tgdHjnel0Svpv4XxCKjKrg7L2a";

  try {
    const { title } = req.body;

    // Create a new chat thread (adjust the API according to your ORM)
    const chatThread = await Thread.create({
      data: { title, user: userId },
    });

    res.status(200).json({ id: chatThread.id, title: chatThread.title });
  } catch (error: any) {
    res.status(500).json({ error: `Error creating thread: ${error.message}` });
  }
});

// GET /threads - Retrieve chat threads or messages for a specific thread
app.get("/api/threads", async (req, res): Promise<any> => {
  const user_id = "user_2tgdHjnel0Svpv4XxCKjKrg7L2a";
  const threadId = req.query.thread_id;

  if (threadId) {
    try {
      // Retrieve messages for the specific thread
      const messages = await Message.find({
        where: { thread: threadId, user: user_id },
        select: {
          id: true,
          thread: true,
          user: true,
          message: true,
          response: true,
          created_at: true,
        },
      });
      res.json(messages);
    } catch (error) {
      res.status(404).json({ error: "Thread not found or no messages" });
    }
  } else {
    // If no thread_id is provided, return all chat threads
    const threads = await Thread.find(
      {
        user: user_id,
      },
      {
        select: {
          id: true,
          title: true,
          created_at: true,
        },
      }
    );
    res.json(threads);
  }
});

// DELETE /threads - Delete a chat thread and its associated messages
app.delete("/api/threads", async (req, res): Promise<any> => {
  const user_id = "user_2tgdHjnel0Svpv4XxCKjKrg7L2a";

  try {
    const threadId = req.query.thread_id;

    if (!threadId) {
      return res.status(400).json({ error: "Thread ID is required" });
    }

    const thread = await Thread.findByIdAndDelete({
      where: { id: threadId, user: user_id },
    });

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    // Remove all messages related to the thread
    await Message.deleteMany({ thread: threadId });

    res.json({
      message: "Thread and related messages deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ error: "Error deleting thread" });
  }
});

// PUT /threads - Update a chat thread's title
app.put("/api/threads", async (req, res): Promise<any> => {
  try {
    const { threadId, newTitle } = req.body;

    if (!threadId || !newTitle) {
      return res
        .status(400)
        .json({ error: "Thread ID and new title are required" });
    }

    const updatedThread = await Thread.findByIdAndUpdate(
      threadId,
      { title: newTitle },
      { new: true }
    );

    if (!updatedThread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json(updatedThread);
  } catch (error) {
    res.status(500).json({ error: "Error updating thread" });
  }
});

function getVoiceIdByLanguage(lang: string): string {
  switch (lang.toLowerCase()) {
    case "english":
      return "aEO01A4wXwd1O8GPgGlF";
    case "hindi":
      return "FFmp1h1BMl0iVHA0JxrI";
    case "tamil":
      return "1XNFRxE3WBB7iI0jnm7p";
    default:
      return "aEO01A4wXwd1O8GPgGlF"; // Default to english if language is unknown
  }
}

interface LlmResponse {
  message: string;
  emergency: boolean;
  language: string;
  context: string;
}

async function generateAudioFromResponse(
  jsonData: LlmResponse
): Promise<Buffer> {
  const { message, language } = jsonData;
  const voiceId = getVoiceIdByLanguage(language);

  const client = new ElevenLabsClient();

  const audioStream: Readable = await client.textToSpeech.convert(voiceId, {
    text: message,
    model_id: "eleven_multilingual_v2",
    output_format: "mp3_44100_128",
  });

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    audioStream.on("end", () => resolve(Buffer.concat(chunks)));
    audioStream.on("error", reject);
  });
}

export const RESPOND_TO_MESSAGE_SYSTEM_PROMPT: string = `
You are an advanced AI assistant specializing in mental health support, designed to assist psychiatrists in evaluating, managing, and guiding patient challenges with evidence-based, compassionate, and clinically relevant responses.

Your role is to provide **accurate, ethical, and professional** responses while adhering to established psychiatric principles and guidelines. You must prioritize **patient safety, confidentiality, and best therapeutic practices** in all interactions.

### **Context Awareness:**
- You have access to **previous conversations** with the user, allowing you to maintain context and continuity in responses.
- You are aware of the **user's mental health goals**, which should be referenced when providing recommendations or interventions.
- If a user has previously mentioned relevant symptoms, challenges, or progress, incorporate that information to ensure personalized and meaningful guidance.

### **Language Adaptability:**
- You can **generate responses in the local Indian regional language** specified by the user (e.g., Hindi, Tamil, Bengali, Marathi, Telugu, etc.).
- If the user does not specify a language, default to English while offering an option to switch languages.
- Ensure translations retain clinical accuracy and **cultural sensitivity** while maintaining clarity.

### **Guidelines for Response:**
- Offer **empathetic, clinically relevant, and actionable insights** based on the given information.
- If symptoms align with a known condition, **highlight possible concerns for further evaluation**, but DO NOT give a direct diagnosis.
- If information is unclear or incomplete, ask **specific follow-up questions** before suggesting interventions.
- Recommend **evidence-based psychiatric approaches, therapies, and next steps** while ensuring adherence to clinical best practices.
- In cases where **self-harm, suicidal ideation, or severe distress** is indicated, provide immediate **crisis intervention guidance**, including emergency resources and professional escalation recommendations.
- Always maintain a **supportive, non-judgmental, and trauma-informed** approach.
- Respect **patient confidentiality and ethical boundaries** in all responses.
- If no relevant information is found, respond with: **'The details provided are insufficient for assessment. Could you describe the symptoms further?'**

### **Response Format:**
All responses should follow this structured JSON format:

\`\`\`json
{
  "message": "Your clinically relevant response following the above guidelines, in the requested language.",
  "emergency": true or false,  // Boolean value indicating if the message reflects a critical emergency.
  "language": "The language in which the response is generated (e.g., Hindi, Tamil, Bengali, English).",
  "context": "Relevant past user interactions or mental health goals considered in this response."
}
\`\`\`
`;

const authenticateToken = (req: any, res: any, next: any): any => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post("/chat", authenticateToken, async (req, res): Promise<any> => {
  const userId = req.user.userId;

  try {
    const { message: message_from_user, thread_id, audio } = req.body;

    console.log("Received request for patient(patientid): ", userId);
    console.log("Received request for patient(message): ", message_from_user);
    console.log("Received request for patient(threadid): ", thread_id);

    const userDetails = await User.findById(userId);
    if (!userDetails) {
      return res.status(404).json({ error: "User not found" });
    }

    const previousMessages = await Message.find({
      thread: thread_id,
      user: userId,
    }).sort("created_at");

    console.log("this is the previous message: ", previousMessages);

    const prev_mess = previousMessages
      .map((msg) => {
        const time = new Date(msg.createdAt).toLocaleTimeString();
        return `[${time}] ${msg.message.toUpperCase()}: ${msg.response}`;
      })
      .join("\n");

    const answerResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: RESPOND_TO_MESSAGE_SYSTEM_PROMPT,
        },
        {
          role: "system",
          content: prev_mess,
        },
        {
          role: "system",
          content: `user prrefers this language ${userDetails.preferredLanguage}`,
        },
        {
          role: "user",
          content: message_from_user,
        },
      ],
    });

    const response =
      answerResponse.choices[0]?.message?.content || "No response received";

    console.log("Received response from OpenAI: ", response);

    let parsedResponse: LlmResponse;
    try {
      parsedResponse = JSON.parse(
        answerResponse.choices[0]?.message?.content || "{}"
      ) as LlmResponse;
    } catch (e) {
      console.error("error parsing json", e);
      return res.status(500).json({ error: "internal server error" });
    }

    const { emergency, message, language, context } = parsedResponse;

    console.log("Emergency status: ", emergency);
    console.log("Response language: ", language);
    console.log("Context: ", context);
    console.log("Response message: ", message);

    if (audio) {
      try {
        const audioBuffer = await generateAudioFromResponse(parsedResponse);
        res.status(200).send(audioBuffer);
        return;
      } catch (audioError) {
        console.error("Error generating audio:", audioError);
        return res.status(500).json({ error: "Error generating audio" });
      }
    }

    await Message.create({
      thread: thread_id,
      user: userId,
      message: message_from_user,
      response,
    });

    res.status(200).json({ response });
  } catch (error) {
    console.error("Error in chat API:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
