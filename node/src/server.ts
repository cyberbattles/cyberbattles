import express from 'express';
import * as http from 'http';
import WebSocket from 'ws';
import Docker from 'dockerode';
import {Duplex} from 'stream';

const PORT: string = process.env.PORT || '1337';
const DOCKER_IMAGE: string = process.env.DOCKER_IMAGE || 'ubuntu:latest';
