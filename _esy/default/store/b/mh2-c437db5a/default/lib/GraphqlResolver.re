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