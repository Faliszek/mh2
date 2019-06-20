open Graphql_lwt;

type user = {
  id: int,
  name: string,
};

let alice = {id: 1, name: "Alice"};
let bob = {id: 2, name: "Bob"};

let users = [alice, bob];

let user: Graphql_lwt.Schema.typ(unit, option(user)) =
  Schema.(
    obj("user", ~fields=user =>
      [
        field("id", ~args=Arg.[], ~typ=non_null(int), ~resolve=(_, p) =>
          p.id
        ),
        field("name", ~args=Arg.[], ~typ=non_null(string), ~resolve=(_, p) =>
          p.name
        ),
      ]
    )
  );
let numbers = [1, 2, 3];

let numberMutation =
  Schema.(
    field(
      "add_random",
      ~typ=non_null(list(non_null(int))),
      ~args=Arg.[arg("number", ~typ=non_null(int))],
      ~resolve=(_, (), number)
      // numbers := [number, ...numbers^];
      => numbers)
  );

let schema =
  Schema.(
    schema(
      [
        io_field(
          "users",
          ~args=Arg.[],
          ~typ=non_null(list(non_null(user))),
          ~resolve=(_, ()) =>
          Lwt_result.return(users)
        ),
      ],
      ~mutations=[numberMutation],
    )
  );