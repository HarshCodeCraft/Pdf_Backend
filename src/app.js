import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import PdfRouter from "./Routes/Pdf.routes.js"
import UserRoutes from "./Routes/Users.routes.js"
import AdminRoutes from "./Routes/Admin.routes.js"

const app = express();
dotenv.config();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({ limit: "2mb" }))

app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}))
app.use(express.static("public"))
app.use(cookieParser())

app.use("/api/v1/pdf", PdfRouter);
app.use("/api/v1/users", UserRoutes);
app.use("/api/v1/admin", AdminRoutes);


export { app }
