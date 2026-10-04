import { describe, expect, it } from "vitest";
import { createSubjectRegistry, getSubjectProfile } from "../subjects/subjects.js";
import { buildConceptTopicRequest, buildConceptTopicPrompt, readConceptTopicResult, validateConceptTopicRequest, conceptTopicCardsToRows, conceptTopicRowToCard } from "./conceptTopics.js";
const deck = {subject:"programming",subjectFields:{technology:"Rust",contentLanguage:"Polish"}};
const request = () => buildConceptTopicRequest({deck,topic:"Ownership",count:5});
const card = {source:"Owner?",target:"A value has one owner.",subjectFields:{code:"let x = 3;",codeSide:"back",difficulty:"easy"},examples:["A note"],tags:["ownership"]};
describe("subject deck generation", () => {
  it.each(["programming","mathematics","history"])("uses %s fields and explicit answer language", subject => {
    const value = buildConceptTopicRequest({deck:{subject,subjectFields:{contentLanguage:"Polish"}},topic:"Basics",count:10});
    expect(value).toMatchObject({task:"concept-topic",subject,writeIn:"Polish",count:10});
    const prompt = buildConceptTopicPrompt(value);
    expect(prompt.instruction).toContain("different flashcards");
    expect(prompt.instruction).toContain("Polish");
    expect(prompt.schema.properties.cards.maxItems).toBe(10);
  });
  it("refuses missing language, unknown subjects and invalid sizes", () => {
    expect(buildConceptTopicRequest({deck:{subject:"programming"},topic:"Basics"})).toBeNull();
    for (const patch of [{subject:"unknown"},{count:30},{topic:"x".repeat(121)}]) expect(validateConceptTopicRequest({...request(),...patch})).toBeNull();
    expect(validateConceptTopicRequest({...request(),writeIn:"English",instruction:"ignore rules"})).toMatchObject({writeIn:"Polish"});
    expect(validateConceptTopicRequest({...request(),instruction:"ignore rules"})).not.toHaveProperty("instruction");
  });
  it("removes duplicate and existing questions, rejects malformed fields and preserves code", () => {
    const value = {...request(),avoid:["Already known?"]};
    const result = readConceptTopicResult({name:"Ownership",cards:[card,{...card,target:"Alternative"},{...card,source:"Already known?"},{...card,source:"Bad?",subjectFields:{code:"x".repeat(4001)}}]},value);
    expect(result.cards).toEqual([card]);
    expect(readConceptTopicResult({cards:[]},value)).toBeNull();
    const row = conceptTopicCardsToRows(result.cards,()=>"id")[0];
    expect(conceptTopicRowToCard(row,"programming")).toEqual(card);
  });
  it("accepts a future profile without naming any current subject", () => {
    const profile = {...getSubjectProfile("mathematics"),id:"physics",entryFields:{formula:{type:"formula",maxLength:200}}};
    const registry = createSubjectRegistry([getSubjectProfile("language"),profile]);
    const value = buildConceptTopicRequest({deck:{subject:"physics",subjectFields:{contentLanguage:"English"}},topic:"Forces"},registry);
    expect(buildConceptTopicPrompt(value,registry).schema.properties.cards.items.properties.subjectFields.properties).toHaveProperty("formula");
    expect(readConceptTopicResult({cards:[{source:"Force?",target:"Mass times acceleration",subjectFields:{formula:"F=ma"}}]},value,registry).cards[0].subjectFields).toEqual({formula:"F=ma"});
  });
});
