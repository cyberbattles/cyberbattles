import axios from 'axios';


const ApiClient = axios.create({
  baseURL: 'http://localhost:1337/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
export default ApiClient;