export default `
    
    type User {
        id: ID!
        username: String!
        email: String!
        googleId: String
        imageUrl: String
        createdOn: String
        videos: [Video]
        jwt: String
    }
    
    type Query {
        getUser(userId: ID!): User
        allUsers: [User!]!
    }

`