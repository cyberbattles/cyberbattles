#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <fcntl.h>
#include <dirent.h>

#define PORT 9999

char *ADMIN_PASSWORD = NULL;

struct Session {
    char command_buffer[64];
    char username[32];
    int is_logged_in;
};

void handle_client(int client_socket);
void trim_newline(char *str);
int get_next_id();

int main() {
    int server_fd, new_socket;
    struct sockaddr_in address;
    int opt = 1;
    int addrlen = sizeof(address);

    ADMIN_PASSWORD = getenv("ADMIN_PASS");
    if (ADMIN_PASSWORD == NULL) {
        printf("[WARNING] ADMIN_PASS not set. Using default.\n");
        ADMIN_PASSWORD = "default_pass";
    }

    mkdir("data", 0777);
    mkdir("data/admin", 0777);
    mkdir("data/admin/inbox", 0777);

    if(access("data/counter.txt", F_OK) == -1) {
        FILE *f = fopen("data/counter.txt", "w");
        if (f) { fprintf(f, "0"); fclose(f); }
    }

    if ((server_fd = socket(AF_INET, SOCK_STREAM, 0)) == 0) {
        perror("Socket failed");
        exit(EXIT_FAILURE);
    }

    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR | SO_REUSEPORT, &opt, sizeof(opt))) {
        perror("setsockopt");
        exit(EXIT_FAILURE);
    }

    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(PORT);

    if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) < 0) {
        perror("Bind failed");
        exit(EXIT_FAILURE);
    }

    if (listen(server_fd, 10) < 0) {
        perror("Listen");
        exit(EXIT_FAILURE);
    }

    printf("VulneraMail Server Started on %d\n", PORT);
    printf("Admin Password Hash: [HIDDEN] (Length: %ld)\n", strlen(ADMIN_PASSWORD));

    while (1) {
        if ((new_socket = accept(server_fd, (struct sockaddr *)&address, (socklen_t *)&addrlen)) < 0) {
            perror("accept");
            continue;
        }

        if (fork() == 0) {
            close(server_fd);
            handle_client(new_socket);
            exit(0);
        } else {
            close(new_socket);
        }
    }
    return 0;
}

int get_next_id() {
    int id = 0;
    FILE *f = fopen("data/counter.txt", "r+");
    if (f) {
        fscanf(f, "%d", &id);
        id++;
        rewind(f);
        fprintf(f, "%d", id);
        fclose(f);
    }
    return id;
}

void handle_client(int sock) {
    struct Session sess;
    memset(&sess, 0, sizeof(sess));
    strcpy(sess.username, "guest");
    sess.is_logged_in = 0;
    
    char signature_path[128] = ""; 

    char *welcome = "220 Welcome to VulnMail 1.0\n";
    write(sock, welcome, strlen(welcome));

    while (1) {
        char temp_in[256]; 
        memset(temp_in, 0, 256);

        int valread = read(sock, temp_in, 255);
        if (valread <= 0) break;
        trim_newline(temp_in);

        char cmd[16], arg1[64], arg2[64];
        memset(cmd, 0, 16); memset(arg1, 0, 64); memset(arg2, 0, 64);
        sscanf(temp_in, "%s %s %s", cmd, arg1, arg2);

        if (strcmp(cmd, "LOGIN") == 0) {
            if (strcmp(arg1, "admin") == 0) {
                if (strcmp(arg2, ADMIN_PASSWORD) == 0) {
                    strcpy(sess.username, "admin");
                    sess.is_logged_in = 1;
                    dprintf(sock, "200 Admin login successful\n");
                } else {
                    dprintf(sock, "403 Invalid password for admin\n");
                }
            } else {
                strncpy(sess.username, arg1, 31);
                sess.is_logged_in = 1;
                
                char user_dir[256];
                sprintf(user_dir, "data/%s", sess.username);
                mkdir(user_dir, 0777);
                sprintf(user_dir, "data/%s/inbox", sess.username);
                mkdir(user_dir, 0777);
                
                dprintf(sock, "200 Logged in as %s\n", sess.username);
            }
        }
        
        else if (strcmp(cmd, "ECHO") == 0) {
            if(strlen(temp_in) > 5) {
                strcpy(sess.command_buffer, temp_in + 5); 
                dprintf(sock, "200 Echo: %s\n", sess.command_buffer);
            }
        }

        else if (strcmp(cmd, "SEND") == 0) {
            if (!sess.is_logged_in) {
                dprintf(sock, "500 Login first\n");
                continue;
            }
            
            int id = get_next_id();
            char filepath[256];
            
            char rdir[128];
            sprintf(rdir, "data/%s", arg1);
            mkdir(rdir, 0777);
            sprintf(rdir, "data/%s/inbox", arg1);
            mkdir(rdir, 0777);

            sprintf(filepath, "data/%s/inbox/%d.eml", arg1, id);
            FILE *f = fopen(filepath, "w");
            if (f) {
                fprintf(f, "FROM: %s\nTO: %s\nMSG: %s\n", sess.username, arg1, arg2);
                
                if (strlen(signature_path) > 0) {
                    fprintf(f, "\n-- \nSig: ");
                    
                    char full_sig_path[512];
                    sprintf(full_sig_path, "data/%s/%s", sess.username, signature_path);

                    FILE *sig = fopen(full_sig_path, "r");
                    if (sig) {
                        char c;
                        while ((c = fgetc(sig)) != EOF) fputc(c, f);
                        fclose(sig);
                    }
                }
                
                fclose(f);
                dprintf(sock, "200 Sent (ID: %d)\n", id);
            } else {
                dprintf(sock, "500 Write error\n");
            }
        }

        else if (strcmp(cmd, "SET_SIG") == 0) {
            strncpy(signature_path, arg1, 127);
            dprintf(sock, "200 Signature path updated\n");
        }

        else if (strcmp(cmd, "READ") == 0) {
            if (!sess.is_logged_in) {
                dprintf(sock, "500 Login first\n");
                continue;
            }

            char found_path[256] = "";
            DIR *d = opendir("data");
            struct dirent *dir;
            
            if (d) {
                while ((dir = readdir(d)) != NULL) {
                    if (dir->d_type == DT_DIR && dir->d_name[0] != '.') {
                        char candidate[256];
                        sprintf(candidate, "data/%s/inbox/%s.eml", dir->d_name, arg1);
                        if (access(candidate, F_OK) != -1) {
                            strcpy(found_path, candidate);
                            break; 
                        }
                    }
                }
                closedir(d);
            }

            if (strlen(found_path) > 0) {
                FILE *f = fopen(found_path, "r");
                char fbuf[1024];
                memset(fbuf, 0, 1024);
                fread(fbuf, 1, 1023, f);
                fclose(f);
                dprintf(sock, "200 CONTENT:\n%s\n.\n", fbuf);
            } else {
                dprintf(sock, "404 Email ID not found\n");
            }
        }
        
        else if (strcmp(cmd, "WHOAMI") == 0) {
            dprintf(sock, "200 You are %s\n", sess.username);
        }

        else {
            dprintf(sock, "500 Unknown Command\n");
        }
    }
    close(sock);
}

void trim_newline(char *str) {
    char *p = strchr(str, '\n');
    if (p) *p = 0;
    p = strchr(str, '\r');
    if (p) *p = 0;
}
