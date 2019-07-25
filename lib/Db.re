let connect = () => {
  PGOCaml.connect();
                 // dbh |> add(~user_id="569") |> ignore;
};

module User = {
  open PGOCaml;

  type t = {
    id: string,
    email: string,
    password: string,
  };

  module Query = {
    let get =
      connect()
      |> [%sqlf {|
            SELECT * FROM users;
        |}]
      |> List.map(user => {
           let (id, email, password) = user;
           let id = Tablecloth.Option.withDefault(~default="", id);
           let email = Tablecloth.Option.withDefault(~default="", email);
           let password =
             Tablecloth.Option.withDefault(~default="", password);
           {id, email, password};
         });

    let getByEmail = [%sqlf
      {|
          SELECT * FROM users where email = $email LIMIT 1;
      |}
    ];
  };

  let getByEmail = (~email) =>
    connect()
    |> Query.getByEmail(~email)
    |> List.map(user => {
         let (id, email, password) = user;
         {
           id: Tablecloth.Option.withDefault(~default="", id),
           email: Tablecloth.Option.withDefault(~default="", email),
           password: Tablecloth.Option.withDefault(~default="", password),
         };
       });

  let add = [%sqlf {|
    INSERT INTO users VALUES ($user_id);
  |}];
};