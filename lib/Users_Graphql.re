open Graphql_lwt;
open Db.User;
open Tablecloth;

let user: Schema.typ(unit, option(user)) =
  Schema.(
    obj("user", ~doc="A user in the system", ~fields=_ =>
      [
        field(
          "id",
          ~doc="Unique user identifier",
          ~args=Arg.[],
          ~typ=non_null(string),
          ~resolve=(info, p) =>
          p.id
        ),
        field("email", ~typ=non_null(string), ~args=[], ~resolve=(info, p) =>
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
      Users_Domain.getAll() |> Lwt_main.run |> Lwt_result.return
    })
  );