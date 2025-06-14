
import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
      const connectionInstance =  await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        console.log(`\n MongoDB Connected !! Db HOST : ${connectionInstance.connection.host}`)
    } catch (error) {
      console.log("MongoDb Connection FAILED", error)
      process.exit(1)
    }
  }


  export default connectDB