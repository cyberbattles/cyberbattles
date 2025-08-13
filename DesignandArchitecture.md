# Current Project and Design

*This document is written in Markdown, if you are unfamiliar with it please check [this](https://www.markdownguide.org/cheat-sheet/) cheat sheet*

# Project Milestones and Dates
| Milestone | Deadline |
| --------- | -------- |
| Project planning | 12/08 |
| Database Finalised | 19/08 |
| Website Interface | 2/09 |
| Game Instances | 9/09 |
| Join front and back end | 23/09 |
| Creation of challenges | 14/10 |
| Debugging | 21/10 |
| Final Touches | 28/10 |
| Showcase | 4/11 |

# Frontend Frameworks and Page Sketches

Languages/Frameworks:

- React via NextJS. Written in TypeScript to allow for strict type checking, better testing and documentation capabilities. 

- TailwindCSS to simplify the design process.

# Backend Architecture

Languages/Frameworks:

NodeJS. Written in TypeScript. The below modules should make managing Docker easy and avoid the need for another intermediary API between the Backend and Frontend. i.e. The frontend can make direct calls to the backend and provide web access to the Docker TTYs.
- https://github.com/apocas/dockerode-compose
- https://github.com/apocas/dockerode
- https://xtermjs.org/

Docker and Docker Compose for orchestrating simulation environments.
- Using bridge-only docker networks we can control/restrict each environment’s networking as we see fit.

# Database:

Thinking of using Google Firebase for this project. 

Completely free, and we shouldn’t reach the daily thresholds.

### Login:

Firebase Authentication, gives users a UID, set a username for them also. Store this information into a user information document in firebase.

### Team logic:

Store points/players inside a team document. Tuples would include

{

Team/Team ID: Unique UID

Team/Name: Team name

Team/TeamMembers: [Username, Username, Username] of team members

Team/Matches: UID of each match they play, points they got, and their opponents Team name/or ID.

}

### Match logic:

We need a way to store information about what is going on each match etc.

Need some help here with what fields are necessary.

Match/Teams: {Team1, Team 2}

Match/Points: {Team1, Team 2}

Each time a team plays a game, their points gets appended to the leaderboard.

### Leaderboard Logic:

If we want a leaderboard we should set up its own document for this. Otherwise its a bunch of nested calls.

Leaderboard/TeamName: {totalPoints, matches played}

then we can loop through this, i would say refresh the leaderboard once daily. 
