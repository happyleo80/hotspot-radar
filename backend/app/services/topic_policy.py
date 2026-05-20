import re


FORBIDDEN_TOPIC_PATTERN = re.compile(
    r"(政治|政府|外交|总统|首相|大选|选举|议会|国会|人民大会堂|条约|双边关系|国际关系|中俄|中美|中日|中欧|俄中|美方|俄方|访华|国事访问|元首|会谈|合作新篇章|睦邻友好合作|战争|军事|军方|军演|国防|制裁|领土|边境|台湾|香港|澳门|涉政|官员|纪委|反腐|法院|检察院|公安|警方|警察|刑拘|逮捕|判刑|死刑|枪击|恐袭|暴乱|抗议|游行|特朗普|拜登|普京|泽连斯基|以色列|伊朗|乌克兰|俄罗斯|巴勒斯坦)"
)


def is_forbidden_topic(title: str | None) -> bool:
    return bool(FORBIDDEN_TOPIC_PATTERN.search(title or ""))
