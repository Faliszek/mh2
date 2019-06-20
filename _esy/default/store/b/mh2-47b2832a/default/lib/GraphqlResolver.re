open Graphql;

type user = {
  id: int,
  name: string,
};

let users = [{id: 1, name: "Alice"}, {id: 2, name: "Bob"}];

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