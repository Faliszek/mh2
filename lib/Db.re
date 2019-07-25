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
  let add = [%sqlf {|
    INSERT INTO users VALUES ($user_id);
  |}];

  let get =
    connect()
    |> [%sqlf {|
    SELECT * FROM users;
|}]
    |> List.map(user => {
         let (id, email, password) = user;

         let id = Tablecloth.Option.withDefault(~default="", id);
         let email = Tablecloth.Option.withDefault(~default="", email);
         let password = Tablecloth.Option.withDefault(~default="", password);
         //  let email = email |> Tablecloth.Option.withDefault(~default="");
         {id, email, password};
       });
  // print_endline(users)
};