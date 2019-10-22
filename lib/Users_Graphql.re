open Graphql_lwt;
open Tablecloth;

let user: Schema.typ(unit, option(Db.User.userWithoutPassword)) =
  Schema.(
    obj("user", ~doc="A user in the system", ~fields=_ =>
      [
        field(
          "id",
          ~doc="Unique user identifier",
          ~args=Arg.[],
          ~typ=non_null(string),
          ~resolve=(info, p: Db.User.userWithoutPassword) =>
          p.id
        ),
        field(
          "email",
          ~typ=non_null(string),
          ~args=[],
          ~resolve=(info, p: Db.User.userWithoutPassword) =>
          p.email
        ),
      ]
    )
  );

/* list(Mh2Lib.Db.User.user) */
let list: Graphql_lwt.Schema.field(unit, unit) =
  Schema.(
    io_field(
      "users",
      ~args=Arg.[],
      ~typ=non_null(list(non_null(user))),
      ~resolve=(_, u) => {
      Users_Domain.getAll() |> Lwt_result.ok
    })
  );

let one: Graphql_lwt.Schema.field(unit, unit) =
  Schema.(
    io_field(
      "user",
      ~args=Arg.[arg("id", non_null(string))],
      ~typ=user,
      ~resolve=(_, u, id) => {
      Users_Domain.getOne(~id) |> Lwt_result.ok
    })
  );