import axios from 'axios';


const ApiClient = axios.create({
  baseURL: 'http://cyberbattl.es/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
export default ApiClient;