// type numbers = list(int);
// let numbers: numbers = [];

// let schema =
//   Schema.(
//     schema(
//       [
//         field(
//           "numbers",
//           ~typ=non_null(list(non_null(int))),
//           ~args=Arg.[],
//           ~resolve=(a, ()) =>
//           numbers
//         ),
//       ],
//       ~mutations=[
//         field(
//           "add_random",
//           ~typ=non_null(list(non_null(int))),
//           ~args=Arg.[arg("number", ~typ=non_null(int))],
//           ~resolve=(a, (), number) =>
//           numbers
//         ),
//       ],
//     )
//   );
open Graphql;
type role =
  | User
  | Admin;
type user = {
  id: int,
  name: string,
  role,
};

let users = [
  {id: 1, name: "Alice", role: Admin},
  {id: 2, name: "Bob", role: User},
];

let role =
  Schema.(
    enum(
      "role",
      ~doc="The role of a user",
      ~values=[
        enum_value("USER", ~value=User),
        enum_value("ADMIN", ~value=Admin),
      ],
    )
  );

let user =
  Schema.(
    obj("user", ~doc="A user in the system", ~fields=_ =>
      [
        field(
          "id",
          ~doc="Unique user identifier",
          ~typ=non_null(int),
          ~args=[],
          ~resolve=(info, p) =>
          p.id
        ),
        field("name", ~typ=non_null(string), ~args=[], ~resolve=(info, p) =>
          p.name
        ),
        field("role", ~typ=non_null(role), ~args=[], ~resolve=(info, p) =>
          p.role
        ),
      ]
    )
  );

let schema =
  Schema.(
    schema([
      field(
        "users",
        ~typ=non_null(list(non_null(user))),
        ~args=[],
        ~resolve=(info, ()) =>
        users
      ),
    ])
  );

module Graphql_cohttp_lwt = Graphql_cohttp.Make(Schema, Cohttp_lwt.Body);

let () = {
  let callback = Graphql_cohttp_lwt.make_callback(_req => (), schema);
  let server = Cohttp_lwt_unix.Server.make(~callback, ());
  let mode = `TCP(`Port(8080));
  Cohttp_lwt_unix.Server.create(~mode, server) |> Lwt_main.run;
};