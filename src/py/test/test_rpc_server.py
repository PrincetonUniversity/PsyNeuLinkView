# Ezra Zinberg
# PNLV
# test_rpc_server.py
# Calls rpc_server.py.RunComposition() to debug py scripts

import sys

sys.path.insert(0, r'/Users/ezrazinberg/desktop/code/psynl/PsyNeuLinkView/src/py')

import rpc_server as rpc
import copy
# from psyneulink.core.rpc import graph_pb2, graph_pb2_grpc

pnl_container = rpc.Container()
# print(pnl_container)

# comp = pnl_container.hashable_pnl_objects['compositions'][-1]
# print(pnl_container.hashable_pnl_objects['compositions'])

filepath = r'/Users/ezrazinberg/desktop/code/psynl/PsyNeuLinkView/examples/working-test/pnlv-plotting-test.py'
comps = rpc.loadScript(filepath)
# print(comps)

comp = comps[-1]
# print(comp)

class I:
    
    def __init__(self, rows, cols, data):
        self.rows = rows
        self.cols = cols
        self.data = data

# ins = { 'input': {'rows': 8, 'cols': 1, 'data': [10, 1,  2, 3, 4, 5, 10, 7]} } 
ins = {'input': I(8, 1, [10, 1,  2, 3, 4, 5, 10, 7])}

class pref:
    componentName = ''
    parameterName = ''
    condition = 2

pref1 = copy.copy(pref)
pref2 = copy.copy(pref)

pref1.componentName = '(ProcessingMechanism input)'
pref1.parameterName = 'InputPort-0'
pref2.componentName = '(ProcessingMechanism output)'
pref2.parameterName = 'OutputPort-0'

prefs = [pref1, pref2]

# prefs = [{'componentName': 'input-151', 'parameterName': 'InputPort-0', 'condition': 2}, \
#    {'componentName': 'output-151', 'parameterName': 'OutputPort-0', 'condition': 2 } ]



d = {'inputs': ins, 'servePrefs': {'servePrefSet': prefs} } 

class p:
    servePrefSet = [pref1]


class req:
    inputs = ins
    servePrefs = p

# res = rpc.run_composition(comp, ins, p)


gs = rpc.GraphServer()

gen = gs.RunComposition(req, None)

for g in gen:
    print(type(g))

# print("res: " + str(res))
# print("comp: " + str(type(comp)))
# print(comp.results)