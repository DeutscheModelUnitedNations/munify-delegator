Generate the API documentation for Listmonk

```bash
cd src/tasks/apis/listmonk
bunx openapi-typescript https://listmonk.app/docs/swagger/collections.yaml -o listmonk-paths.d.ts
```

The upstream collection is incomplete, so `listmonk-swagger.yaml` is kept here and edited by hand
where needed. Regenerate the types from the local file:

```bash
cd src/tasks/apis/listmonk
bunx openapi-typescript listmonk-swagger.yaml -o listmonk-paths.d.ts
```

Hand-made changes (keep them when pulling a newer upstream version):

- `PATCH /subscribers/{id}` (listmonk >= v5). The mail sync depends on it: unlike PUT it leaves the
  subscriber's lists alone and merges `attribs` key by key.
- `SubscriberQueryRequest.target_list_ids` is an array, not an integer.
