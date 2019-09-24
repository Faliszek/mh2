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
  //TODO: handle failure better, also dont run server if connection is not established
  Db.connect() |> Db.Lwt_thread.on_failure(_, Logger.databaseConnectionError);

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

    | exn => Logger.serverStartFailure(exn);

  let callback = Graphql_cohttp_lwt.make_callback(_req => (), schema);
  let server = Cohttp_lwt_unix.Server.make_response_action(~callback, ());
  let mode = `TCP(`Port(port));

  Logger.serverStartSuccess(~port);

  Lwt_main.run(Cohttp_lwt_unix.Server.create(~on_exn, ~mode, server));

};