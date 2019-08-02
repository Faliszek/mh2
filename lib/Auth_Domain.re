open Db;

let createToken = (~email, ~password) => {
  let hashedPassword = Bcrypt.hash(password);
  // let allow = (args) => "hello";

  print_endline(hashedPassword |> Bcrypt.string_of_hash);
};

//TODO: this function probably should return some record
//with informaiton if email exist, option(token) etc.
let authenticateUser = (~email, ~password) => {
  Db.User.getByEmail(~email)
  |> Lwt.map((user: option(User.t)) => {
       switch (user) {
       | Some(user)
           when
             Bcrypt.verify(password, user.password |> Bcrypt.hash_of_string) =>
         true

       | _ => false
       }
     });
};