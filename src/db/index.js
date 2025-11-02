import mongoose from "mongoose";


const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Mongodb Connected Successfully");
        
    } catch (error) {
        console.error("Mongo Connection Error", error);
        process.exit(1);
    }
};

export default connectDB;
