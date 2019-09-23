open Db;
open Jwto;

let expirationDateInMs = (~days) => 1000.0 *. 60.0 *. 60.0 *. 24.0 *. days;

let createSignedToken = (~id) => {
  let expirationDate = Unix.time() +. expirationDateInMs(~days=2.0);
  let payload = [("sub", id), ("exp", expirationDate |> string_of_float)];

  Jwto.encode(Jwto.HS512, "secret", payload);
};

//TODO: this function probably should return some record
//with informaiton if email exist, option(token) etc. for now option(token) is cool
let authenticateUser = (~email, ~password) => {
  Db.User.getByEmail(~email)
  |> Lwt.map((user: option(User.t)) => {
       switch (user) {
       | Some(user)
           when
             Bcrypt.verify(password, user.password |> Bcrypt.hash_of_string) =>
         let token = createSignedToken(~id=user.id);

         switch (token) {
         | Ok(token) => Some(token)
         | Error(err) => None
         };

       | _ => None
       }
     });
};
