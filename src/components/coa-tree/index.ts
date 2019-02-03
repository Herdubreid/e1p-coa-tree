// AB Search Component
import './style.scss';
import * as ko from 'knockout';
import 'jstree';
import { IStateParams } from '../../state';

let self: ViewModel = null;

class ViewModel {
    $busy = ko.observable(false);
    tree: JSTree;
    addChildren(lda: number, objFrom: string, objTo: string, rows: any[]): any[] {
        if (lda > 9) return [];
        const count = rows.filter((r: any) => r.F0901_LDA == lda).length;
        if (count == 0) return this.addChildren(lda + 1, objFrom, objTo, rows);
        return rows
            .filter((r: any) => r.F0901_LDA == lda)
            .filter((r: any) => r.F0901_OBJ >= objFrom && r.F0901_OBJ < objTo)
            .map((r: any, i: number, a: any[]) => {
                const next = a[i + 1];
                const obj = next ? next.F0901_OBJ : objTo;
                const children = this.addChildren(lda + 1, r.F0901_OBJ, obj, rows)
                return {
                    id: r.F0901_AID,
                    text: `${r.F0901_OBJ}${r.F0901_SUB > ' ' ? '.' : ''}${r.F0901_SUB} - ${r.F0901_DL01}`,
                    icon: children.length > 0
                        ? 'fas fa-layer-group icon'
                        : r.F0901_PEC == 'N' ? 'fas fa-times small-icon' : 'fas fa-check small-icon',
                    data: {
                        lda: Number(r.F0901_LDA),
                        obj
                    },
                    children
                }
            });
    }
    getNode(node: any, cb: any): any {
        if (node.id == '#') {
            if (self.params.state.rows) {
                cb.call(this, self.params.state.rows);
            } else {
                const rq = {
                    dataServiceType: 'AGGREGATION',
                    outputType: 'GRID_DATA',
                    targetName: 'V0901Q',
                    targetType: 'view',
                    maxPageSize: '500',
                    aliasNaming: true,
                    findOnEntry: 'TRUE',
                    aggregation: {
                        aggregations: [
                            {
                                aggregation: 'COUNT',
                                column: '*'
                            },
                            {
                                aggregation: 'MIN',
                                column: 'F0901.LDA'
                            }

                        ],
                        groupBy: [
                            {
                                column: 'F0006.MCU'
                            },
                            {
                                column: 'F0006.LDM'
                            },
                            {
                                column: 'F0006.DL01'
                            }
                        ],
                        orderBy: [{
                            column: 'F0006.MCU',
                            direction: 'ASC'
                        }]
                    }
                };
                callAISService(rq, DATA_SERVICE, (response: any) => {
                    const result = response.ds_V0901Q.output
                        .filter((r: any) => r.COUNT > 1)
                        .map((r: any, i: number, a: any[]) => {
                            const g = r.groupBy;
                            const lda = Number(r['F0901.LDA_MIN']) - 1;
                            const next = a[i + 1];
                            const id = g['F0006.MCU'].trim();
                            return {
                                id,
                                text: `${id} - ${g['F0006.DL01']} (${r.COUNT})`,
                                icon: 'fas fa-home large-icon',
                                data: {
                                    lda,
                                    mcu: next ? next.groupBy['F0006.MCU'].trim() : null,
                                    obj: null as string
                                },
                                children: true
                            };
                        });
                    cb.call(this, result);
                    self.params.state.rows = result;
                });
            }
        }
        else {
            const rq = {
                dataServiceType: 'BROWSE',
                outputType: 'GRID_DATA',
                targetName: 'F0901',
                targetType: 'table',
                findOnEntry: 'TRUE',
                returnControlIDs: 'DL01|LDA|PEC|MCU|OBJ|SUB|AID',
                maxPageSize: '1000',
                aliasNaming: true,
                query: {
                    condition: [
                        {
                            value: [
                                {
                                    content: node.id,
                                    specialValueId: 'LITERAL'
                                }
                            ],
                            controlId: 'F0901.MCU',
                            operator: 'EQUAL'
                        }
                    ],
                    matchType: 'MATCH_ALL',
                },
                aggregation: {
                    orderBy: [
                        {
                            column: 'F0901.OBJ',
                            direction: 'ASC'
                        }
                    ]
                }
            };
            callAISService(rq, DATA_SERVICE, (response: any) => {
                const lda = node.data.lda + 1;
                const root = self.addChildren(lda, '', '9999', response.fs_DATABROWSE_F0901.data.gridData.rowset);
                cb.call(this, root);
            });
        }
    }
    constructor(public params: IStateParams) {
        self = this;
        this.tree = $('#tree').jstree({
            core: {
                check_callback: true,
                data: this.getNode
            }
        });
    }
}

ko.components.register('coa-tree', {
    viewModel: ViewModel,
    template: require('./template.html')
});
