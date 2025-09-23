import axios from 'axios';


const ApiClient = axios.create({
  baseURL: 'https://cyberbattl.es/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
export default ApiClient;