import express from "express"
import cors from "cors"
import connectDB from "./db/index.js";   
import dotenv from "dotenv";
dotenv.config({
    path:"./.env"
});


connectDB();

const app=express();

//basic configuration
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))


//cors configuration
app.use(cors({
    origin:process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173",
    credentials:true,
    methods:["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allowedHeaders:["Content-Type","Authorizations"],
}),

);

//import the routes
import helthCheckRouter from './routes/healthcheck.routes.js';
import authRouter from './routes/auth.routes.js'
app.use("/api/v1/healthcheck",helthCheckRouter)
app.use("/api/v1/auth",authRouter)


app.get('/',(req,res)=>{
    res.send("Welcome to Base Campy")
})

export default app;