import mongoose from "mongoose";
import {DB_NAME} from '../constant.js'

const connect=async ()=>{
    try {
   const connectionInstance= await mongoose.connect(`${process.env.MONGODB_URL}`)
   console.log(`DB connected || DB HOST: ${connectionInstance.connection.host}`);
} catch (error) {
    console.log("error to connection database",error);
    process.exit(1)
}
}

export default connect