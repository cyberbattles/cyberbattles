import axios from 'axios';

const ApiClient = axios.create({
  baseURL: 'https://cyberbattl.es/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
export default ApiClient;





// If you are running the backend on localhost - use this instead:

// import axios from 'axios';

// const ApiClient = axios.create({
//   baseURL: 'http://localhost:1337/api',
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });
// export default ApiClient;