import mongoose from "mongoose";

const connectDB = async ()=>{
    console.log(process.env.MONGODB_URI);
    
    try {
        
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`mongodb connected ${conn.connection.host}`);
        
    } catch (error) {
        console.log(error);
        
    }
}

export default connectDB