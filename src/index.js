import app from "./app.js";




const port=process.env.PORT||3000;
app.get('/',(req,res)=>{
    res.send('Hello World!');
});

app.get('/user',(req,res)=>{
    res.send(`User Name is ${process.env.user}`);
});

app.listen(port,()=>{
    console.log(`Example app listening on port http://localhost:${port}`);
});
