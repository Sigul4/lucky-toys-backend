require("dotenv").config();
const server = require("./server");

// server port
const port = process.env.PORT || 5001;

const startServer = () => {
  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

startServer();
