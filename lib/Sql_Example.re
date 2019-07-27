module Store = {
  module Lwt_thread = {
    include Lwt;
    let close_in = Lwt_io.close;
    let really_input = Lwt_io.read_into_exactly;
    let input_binary_int = Lwt_io.BE.read_int;
    let input_char = Lwt_io.read_char;
    let output_string = Lwt_io.write;
    let output_binary_int = Lwt_io.BE.write_int;
    let output_char = Lwt_io.write_char;
    let flush = Lwt_io.flush;
    let open_connection = a => Lwt_io.open_connection(a);
    type in_channel = Lwt_io.input_channel;
    type out_channel = Lwt_io.output_channel;
  };

  module Db = PGOCaml_generic.Make(Lwt_thread);

  let database = Sys.getenv("USER");
  let connect = Db.connect(~database);
  let pool: Lwt_pool.t(Db.t(Hashtbl.t(string, bool))) =
    Lwt_pool.create(16, ~validate=Db.alive, connect);
  let with_pool = f => Lwt_pool.use(pool, f);

  let run_query = f => with_pool(f);
};

/* Important: module named `PGOCaml` has to be in scope */
/* this is what the generated code will reference */
module PGOCaml = Store.Db;

module Queries = {
  let initialize = [%sqlf
    {|
        CREATE TABLE IF NOT EXISTS ppx_pgsql_example_todo_entries (
          id SERIAL PRIMARY KEY,
          line TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP NOT NULL DEFAULT now(),
          updated_at TIMESTAMP
        )
      |}
  ];

  let add_todo = [%sqlf
    {|
        INSERT INTO ppx_pgsql_example_todo_entries
               (line)
        VALUES ($line)
     RETURNING id
      |}
  ];

  let set_todo_status = [%sqlf
    {|
        UPDATE ppx_pgsql_example_todo_entries
           SET status = $status,
               updated_at = now()
         WHERE id = $id
      |}
  ];

  let remove_todo = [%sqlf
    {|
      DELETE FROM ppx_pgsql_example_todo_entries WHERE id = $id
    |}
  ];

  let retrieve_all_todos = [%sqlf
    {|
        SELECT id, line, status, created_at, updated_at
          FROM ppx_pgsql_example_todo_entries
      ORDER BY created_at DESC
         LIMIT $limit
      |}
  ];

  let retrieve_todos_by_status = [%sqlf
    {|
        SELECT id, line, status, created_at, updated_at
          FROM ppx_pgsql_example_todo_entries
         WHERE status = $status
      ORDER BY created_at DESC
         LIMIT $limit
      |}
  ];
};

type todo = {
  id: int,
  line: string,
  status: [ | `Pending | `Done],
  created_at: CalendarLib.Calendar.t,
  updated_at: option(CalendarLib.Calendar.t),
};

let string_of_status =
  fun
  | `Pending => "pending"
  | `Done => "done";

let status_of_string =
  fun
  | "pending" => `Pending
  | "done" => `Done
  | _ => assert(false);

let todo_of_row = ((id, line, status, created_at, updated_at)) => {
  let id = Int32.to_int(id);
  let status = status_of_string(status);
  {id, line, status, created_at, updated_at};
};

let init_db = () => Store.run_query(Queries.initialize);

let add_todo = line =>
  switch%lwt (Store.run_query @@ Queries.add_todo(~line)) {
  | [id] => Lwt.return @@ Int32.to_int(id)
  | _ => assert(false)
  };

let set_todo_status = (id, status) => {
  let status = string_of_status(status);
  Store.run_query @@ Queries.set_todo_status(~id, ~status);
};

let remove_todo = id => Store.run_query @@ Queries.remove_todo(~id);

let retrieve_todos = (~status=?, ~limit=100, ()) => {
  let limit = Int64.of_int(limit);
  let%lwt results =
    Store.run_query @@
    (
      switch (status) {
      | None => Queries.retrieve_all_todos(~limit)
      | Some(status) =>
        let status = string_of_status(status);
        Queries.retrieve_todos_by_status(~status, ~limit);
      }
    );

  Lwt.return @@ List.map(todo_of_row, results);
};

let show_todo = todo => {
  let {id, line, status, created_at, updated_at} = todo;
  let status = string_of_status(status);
  let created_at = CalendarLib.Printer.Calendar.to_string(created_at);
  let updated_at =
    switch (updated_at) {
    | None => "*"
    | Some(ts) => CalendarLib.Printer.Calendar.to_string(ts)
    };

  Lwt_io.printf(
    "%d. %s %s %s %s\n",
    id,
    created_at,
    updated_at,
    status,
    line,
  );
};

let show_todos = todos => {
  let%lwt _ = Lwt_list.map_s(show_todo, todos);
  Lwt.return_unit;
};

let main = args =>
  Lwt_main.run @@
  (
    switch (args) {
    | ["init"] => init_db()
    | ["show"] =>
      let%lwt results = retrieve_todos();
      show_todos(results);
    | ["show", "--pending"] =>
      let%lwt results = retrieve_todos(~status=`Pending, ());
      show_todos(results);
    | ["show", "--done"] =>
      let%lwt results = retrieve_todos(~status=`Done, ());
      show_todos(results);
    | ["add", line] =>
      let%lwt id = add_todo(line);
      Lwt_io.printf("Added ID=%d\n", id);
    | ["set-status", id, status] =>
      switch (Int32.of_string(id), status_of_string(status)) {
      | exception _ =>
        Lwt_io.printf("Invalid id=%s or status=%s\n", id, status)
      | (id, status) =>
        let%lwt () = set_todo_status(id, status);
        Lwt_io.printf("Updated.\n");
      }
    | ["remove", id] =>
      switch (Int32.of_string_opt(id)) {
      | None => Lwt_io.printf("Invalid id: %s\n", id)
      | Some(id) => remove_todo(id)
      }
    | _ => Lwt_io.printf("Invalid command or parameters\n")
    }
  );

let () = Sys.argv |> Array.to_list |> List.tl |> main;