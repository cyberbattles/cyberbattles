import ApiClient from './ApiClient';

export const createSession = async (): Promise<any> => {
  try {
    const response = await ApiClient.post('/session');
    return response.data;
  } catch (error) {
    console.error('Error creating session:', error);
  }
};

export const startSession = async (): Promise<any> => {
  try {
    const response = await ApiClient.post('/start-session');
    return response.data;
  } catch (error) {
    console.error('Error starting session:', error);
  }
};

// export const fetchClients = async (): Promise<any> => {
//     try {
//         const response = await ApiClient.get('/clients');
//         return response.data;
//     } catch (error) {
//         console.error("Error fetching clients:", error);
//     }
// }

// export const fetchClientById = async (clientId: string | number): Promise<any> => {
//     try {
//         const response = await ApiClient.get(`/clients/${clientId}`);
//         return response.data;
//     } catch (error) {
//         console.error("Error fetching client by ID:", error);
//     }
// }
