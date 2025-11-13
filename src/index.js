import app from "./app.js"
import dotenv from "dotenv"
import connect from './db/dbConnection.js'

dotenv.config({
path:'./.env'
})

connect().then(()=>{
app.listen(process.env.PORT,()=>{
console.log(`Server is running at port ${process.env.PORT}`);
})
})
.catch((err)=>{
console.log("some errors to running",err);
})

/*
let app=express()

;(async ()=>{
try {
await mongoose.connect(${process.env.MONGODB_URL}/${DB_NAME})
app.on("error",(error)=>{
console.log("ERR",error);
throw error
})
app.listen(process.env.PORT,()=>{
console.log(the server is start at ${process.env.PORT} port);
})

} catch (error) {  
    console.log("ERROR",error);  
    throw error;  
}

})()
*/.