import Table from './Table.svelte';
import TableHeader from './TableHeader.svelte';
import TableBody from './TableBody.svelte';
import TableRow from './TableRow.svelte';
import TableHead from './TableHead.svelte';
import TableCell from './TableCell.svelte';
import TablePagination from './TablePagination.svelte';

export const DataTable = {
	Root: Table,
	Header: TableHeader,
	Body: TableBody,
	Row: TableRow,
	Head: TableHead,
	Cell: TableCell,
	Pagination: TablePagination
};

export default DataTable;
