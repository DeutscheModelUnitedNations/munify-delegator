#!/usr/bin/env bash
# Publishes the HTML reports of a CI run to the gh-pages branch, which GitHub Pages serves.
#
# Every artifact directory "$REPORTS_DIR/report-<name>/" lands at "runs/<date>-<run>-<attempt>/<name>/".
# With LATEST_PREFIX set (e.g. "main"), the reports named in LATEST_REPORTS are also copied to
# "<prefix>/<name>/" as a stable URL.
# Run folders older than RETENTION_DAYS are pruned on every publish.
#
# The branch is always force-pushed as a single orphan commit, so pruned reports (screenshots,
# traces) don't stay in its history forever. Concurrent runs are serialized by the lease: a push
# that lost the race re-clones and re-applies its changes.
set -euo pipefail

: "${REPORTS_DIR:?}" "${GITHUB_REPOSITORY:?}" "${GITHUB_TOKEN:?}" "${GITHUB_RUN_ID:?}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
LATEST_PREFIX="${LATEST_PREFIX:-}"
LATEST_REPORTS="${LATEST_REPORTS:-}"
BRANCH=gh-pages
OUTPUT="${GITHUB_OUTPUT:-/dev/null}"

reports_dir="$(cd "$REPORTS_DIR" 2>/dev/null && pwd)" || reports_dir=""
names=()
if [ -n "$reports_dir" ]; then
	for dir in "$reports_dir"/report-*/; do
		if [ -d "$dir" ]; then
			names+=("$(basename "$dir" | sed 's/^report-//')")
		fi
	done
fi
if [ ${#names[@]} -eq 0 ]; then
	echo "No reports to publish."
	echo "reports=" >>"$OUTPUT"
	exit 0
fi

slug="$(date -u +%Y%m%d)-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT:-1}"
cutoff="$(date -u -d "-${RETENTION_DAYS} days" +%Y%m%d)"
remote="${PUBLISH_REMOTE:-https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git}"
work="$(mktemp -d)"

for attempt in 1 2 3 4 5; do
	site="$work/site-$attempt"
	if git clone --quiet --depth 1 --branch "$BRANCH" "$remote" "$site" 2>/dev/null; then
		lease="$(git -C "$site" rev-parse HEAD)"
	else
		# First publish: the branch doesn't exist yet, and the lease requires it to stay that way.
		git init --quiet "$site"
		git -C "$site" remote add origin "$remote"
		lease=""
	fi

	if [ -d "$site/runs" ]; then
		for dir in "$site"/runs/*/; do
			run_date="$(basename "$dir" | cut -d- -f1)"
			if [[ "$run_date" =~ ^[0-9]{8}$ ]] && [ "$run_date" -lt "$cutoff" ]; then
				rm -rf "$dir"
			fi
		done
	fi

	for name in "${names[@]}"; do
		dests=("runs/$slug/$name")
		if [ -n "$LATEST_PREFIX" ] && [[ " $LATEST_REPORTS " == *" $name "* ]]; then
			dests+=("$LATEST_PREFIX/$name")
		fi
		for dest in "${dests[@]}"; do
			rm -rf "${site:?}/$dest"
			mkdir -p "$site/$dest"
			cp -R "$reports_dir/report-$name/." "$site/$dest/"
		done
	done
	# Serve the files as-is; Jekyll would skip paths starting with an underscore.
	touch "$site/.nojekyll"

	git -C "$site" checkout --quiet --orphan "publish-$attempt"
	git -C "$site" add -A
	git -C "$site" -c user.name='github-actions[bot]' \
		-c user.email='41898282+github-actions[bot]@users.noreply.github.com' \
		commit --quiet -m "Publish reports of run ${GITHUB_RUN_ID} (${names[*]})"

	if git -C "$site" push --quiet --force-with-lease="refs/heads/$BRANCH:$lease" origin "HEAD:refs/heads/$BRANCH"; then
		echo "Published ${names[*]} to runs/$slug"
		echo "reports=${names[*]}" >>"$OUTPUT"
		echo "path=runs/$slug" >>"$OUTPUT"
		exit 0
	fi
	echo "Push lost a race with another run (attempt $attempt), retrying..."
	sleep $((2 ** attempt))
done

echo "::error::Could not publish the reports to $BRANCH after 5 attempts."
exit 1
