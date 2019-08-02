module Graphql_cohttp_lwt =
  Graphql_cohttp.Make(
    Graphql_lwt.Schema,
    Cohttp_lwt_unix.IO,
    Cohttp_lwt.Body,
  );

let schema =
  Graphql_lwt.Schema.(schema([], ~mutations=[Auth.Graphql.loginMutation]));

let run = (~addres="127.0.0.1", ~port=6789, ()) => {
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
  let port = port |> string_of_int;
  print_endline("🐫 Server GraphQL running on " ++ port);
  Db.connect() |> ignore;
  Lwt_main.run(Cohttp_lwt_unix.Server.create(~on_exn, ~mode, server));
};