open Graphql_lwt;
module Graphql_cohttp_lwt =
  Graphql_cohttp.Make(Schema, Cohttp_lwt_unix.IO, Cohttp_lwt.Body);

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

let token = "asdasdasdasdas";
let loginPayload =
  Schema.(
    obj("result", ~doc="Login auth result", ~fields=_ =>
      [
        io_field(
          "token", ~typ=non_null(string), ~args=Arg.[], ~resolve=(ctx, s) =>
          Lwt_result.return(token)
        ),
      ]
    )
  );
let schema =
  Schema.(
    schema(
      [
        io_field(
          "users",
          ~typ=non_null(list(non_null(user))),
          ~args=Arg.[],
          ~resolve=(_, _) =>
          Lwt_result.return(users)
        ),
      ],
      ~mutations=[
        io_field(
          "login",
          ~typ=non_null(loginPayload),
          ~args=
            Arg.[
              arg("email", ~typ=non_null(string)),
              arg("password", ~typ=non_null(string)),
            ],
          ~resolve=(_, _, email, password) => {
            print_endline(email);
            print_endline(password);
            Lwt_result.return(token);
          },
        ),
      ],
    )
  );

let run = (~addres="127.0.0.1", ~port=6789, ()) => {
  // open Cohttp;

  open Cohttp_lwt_unix;

  let on_exn =
    fun
    | [@implicit_arity] Unix.Unix_error(error, func, arg) =>
      Logs.warn(m =>
        m(
          "Client connection error %s: %s(%S)",
          Unix.error_message(error),
          func,
          arg,
        )
      )
    | exn => Logs.err(m => m("Unhandled exception: %a", Fmt.exn, exn));

  let callback = Graphql_cohttp_lwt.make_callback(_req => (), schema);
  let server = Cohttp_lwt_unix.Server.make_response_action(~callback, ());
  let mode = `TCP(`Port(port));
  Lwt_main.run(Cohttp_lwt_unix.Server.create(~on_exn, ~mode, server));
};