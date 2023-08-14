"use client";

import {
  Button,
  DatePicker,
  DatePickerProps,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  RadioChangeEvent,
  Select,
  Space,
  notification,
} from "antd";
import styles from "./page.module.css";
import { useEffect, useRef, useState } from "react";
import { Container, Person } from "./interfaces";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const urlAPI = "http://localhost:8000/";

async function fetchAPI(
  urlBase: string,
  path: string,
  method: string = "GET",
  body: any = {}
) {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: "Token " + process.env.NEXT_PUBLIC_TOKEN,
    };
    let response;

    if (method !== "GET") {
      response = await fetch(urlBase + path, {
        headers,
        method,
        body: JSON.stringify(body),
      });
    } else {
      response = await fetch(urlBase + path, {
        headers,
      });
    }

    console.log(response);
    const jsonData = await response.json();
    console.log(jsonData);
    return jsonData;
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

export default function Home() {
  //FormPersonArea
  const [formPerson] = Form.useForm();
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPersonWeight, setSelectedPersonWeight] = useState<number>(0.0);
  const [selectedPersonName, setSelectedPersonName] = useState<string>("");
  const [enableNextButton, setEnableNextButton] = useState<boolean>(false);
  const personId = useRef<number>(0);
  const canNextPage = useRef<boolean>(false);

  function handleSelectPeople(value: string) {
    const person = persons.find((person) => person.name === value);
    formPerson.setFieldsValue({ person: person?.name });
    if (person) {
      formPerson.setFieldsValue({ kg: person.kg });
      personId.current = person.id;
      setSelectedPersonWeight(person.kg);
      setSelectedPersonName(person.name);
      setEnableNextButton(true);
    }
  }

  async function handleNext() {
    formPerson.submit();
    const values = await formPerson.validateFields();
    if (values?.errorFields?.length > 0) {
      return;
    } else {
      let body = {
        kg: values.kg,
      };

      await fetchAPI(urlAPI, "api/calculate/daily-goal/", "POST", body)
        .then((res) => {
          if (res && res.daily_goal) {
            dailyGoal.current = res.daily_goal;
          } else {
            notify.error({
              message: "Erro ao calcular meta diária!",
              description:
                "Ocorreu um erro ao calcular a meta diária no servidor!",
              placement: "topRight",
              duration: 5,
            });
            canNextPage.current = false;
            return;
          }
        })
        .catch((err) => {
          notify.error({
            message: "Erro ao calcular meta diária!",
            description:
              "Ocorreu um erro ao calcular a meta diária! Erro: " + err,
            placement: "topRight",
            duration: 5,
          });
          canNextPage.current = false;
          return;
        });
      let bodyCreateInfo = {
        person_id: personId.current,
        daily_goal: dailyGoal.current,
      };
      await fetchAPI(urlAPI, "api/infos/", "POST", bodyCreateInfo)
        .then((res) => {
          if (
            res &&
            res.message !== "An Info object already exists for today."
          ) {
            console.log("Não existia mas foi criado");
          } else if (
            res &&
            res.message === "An Info object already exists for today."
          ) {
            console.log("Já existia");
          } else {
            notify.error({
              message: "Erro ao criar informações!",
              description: "Ocorreu um erro ao criar informações no servidor!",
              placement: "topRight",
              duration: 5,
            });
            canNextPage.current = false;
            return;
          }
        })
        .catch((err) => {
          notify.error({
            message: "Erro ao criar informações!",
            description: "Ocorreu um erro ao criar informações! Erro: " + err,
            placement: "topRight",
            duration: 5,
          });
          canNextPage.current = false;
          return;
        });
      let path = "api/persons/" + personId.current + "/";
      await fetchAPI(urlAPI, path, "GET").then((res) => {
        if (res && res.now_drink) {
          nowDrink.current = res.now_drink;
        } else {
          notify.error({
            message: "Erro ao pegar informações!",
            description: "Ocorreu um erro ao pegar informações do servidor!",
            placement: "topRight",
            duration: 5,
          });
          canNextPage.current = false;
          return;
        }
      });

      let pathToInfos = "api/infos/" + nowDrink.current + "/";
      await fetchAPI(urlAPI, pathToInfos, "GET").then((res) => {
        if (res) {
          dailyConsumed.current = res.drank;
          goal.current = res.reached_goal;
          console.log("goal: " + goal.current);
        } else {
          notify.error({
            message: "Erro ao pegar informações!",
            description: "Ocorreu um erro ao pegar informações do servidor!",
            placement: "topRight",
            duration: 5,
          });
          canNextPage.current = false;
          return;
        }
      });

      let bodyRemaining = {
        daily_goal: dailyGoal.current,
        drank: dailyConsumed.current,
      };

      await fetchAPI(
        urlAPI,
        "api/calculate/remaining-percentage/",
        "POST",
        bodyRemaining
      ).then((res) => {
        if (res && res.remaining_percent) {
          dailyConsumedPercent.current = parseFloat(
            res.remaining_percent
          ).toFixed(2);
        } else {
          notify.error({
            message: "Erro ao pegar informações!",
            description: "Ocorreu um erro ao pegar informações do servidor!",
            placement: "topRight",
            duration: 5,
          });
          canNextPage.current = false;
          return;
        }
      });

      await fetchAPI(
        urlAPI,
        "api/calculate/remaining-goal/",
        "POST",
        bodyRemaining
      ).then((res) => {
        if (res) {
          dailyGoalRemaining.current = res.remaining_goal;
          canNextPage.current = true;
          return;
        } else {
          notify.error({
            message: "Erro ao pegar informações!",
            description: "Ocorreu um erro ao pegar informações do servidor!",
            placement: "topRight",
            duration: 5,
          });
          canNextPage.current = false;
          return;
        }
      });

      if (canNextPage.current) {
        canNextPage.current = false;
        setActivatedSection("2");
      }
    }
  }

  //FormConsumeArea
  const [formConsume] = Form.useForm();
  const today = dayjs();
  const [valueContainer, setValueContainer] = useState(1.0);
  const [containers, setContainers] = useState<Container[]>([]);
  const [consumeButtonActive, setConsumeButtonActive] =
    useState<boolean>(false);
  const dailyGoal = useRef<number>(0.0);
  const dailyGoalRemaining = useRef<number>(0.0);
  const dailyConsumed = useRef<number>(0.0);
  const dailyConsumedPercent = useRef<string>("0");
  const goal = useRef<boolean>(false);
  const nowDrink = useRef<number>(0);
  const [activateRefresh, setActivateRefresh] = useState<boolean>(false);
  const [valueRadio, setValueRadio] = useState<number | null>(0.0);

  const onChangeDatePickcer: DatePickerProps["onChange"] = (
    date,
    dateString
  ) => {
    console.log(date, dateString);
  };

  const onChangeContainer = (e: RadioChangeEvent) => {
    setConsumeButtonActive(true);
    setValueContainer(e.target.value);
  };

  function fetchContainers() {
    fetchAPI(urlAPI, "api/containers/").then((data) => {
      if (data && data.results) {
        setContainers(data.results);
      } else {
        setContainers([]);
      }
    });
  }

  async function handleConsume() {
    let body = {
      person_id: personId.current,
      drink: valueContainer,
    };
    await fetchAPI(urlAPI, "api/drink/", "PUT", body).then((res) => {
      if (res) {
        console.log("Consumiu");
        notify.success({
          message: "Consumiu com sucesso!",
          description: "O consumo foi registrado com sucesso!",
          placement: "topRight",
          duration: 3,
        });
      } else {
        notify.error({
          message: "Erro ao consumir!",
          description: "Ocorreu um erro ao consumir!",
          placement: "topRight",
          duration: 3,
        });
      }
    });
  }

  //FormHistoryArea

  //General Area
  const [formHistory] = Form.useForm();

  const [activatedSection, setActivatedSection] = useState("1");
  const [notify, contextHolder] = notification.useNotification();
  const [openModal, setOpenModal] = useState(false);
  const [formModal] = Form.useForm();

  useEffect(() => {
    setActivatedSection("1");
    setSelectedPersonWeight(0.0);
  }, []);

  useEffect(() => {
    if (activatedSection === "1") {
      formPerson.resetFields();
      fetchAPI(urlAPI, "api/persons/").then((data) => {
        if (data && data.results) {
          setPersons(data.results);
        } else {
          setPersons([]);
          setSelectedPersonWeight(0.0);
        }
      });
    } else if (activatedSection === "2") {
      fetchContainers();
    }
  }, [activatedSection, openModal, formPerson]);

  useEffect(() => {
    async function refreshMeta() {
      let pathToInfos = "api/infos/" + nowDrink.current + "/";
      await fetchAPI(urlAPI, pathToInfos, "GET").then((res) => {
        if (res) {
          dailyConsumed.current = res.drank;
          goal.current = res.reached_goal;
          dailyGoal.current = res.daily_goal;
        } else {
          return;
        }
      });

      let bodyRemaining = {
        daily_goal: dailyGoal.current,
        drank: dailyConsumed.current,
      };

      await fetchAPI(
        urlAPI,
        "api/calculate/remaining-percentage/",
        "POST",
        bodyRemaining
      ).then((res) => {
        if (res && res.remaining_percent) {
          dailyConsumedPercent.current = parseFloat(
            res.remaining_percent
          ).toFixed(2);
        } else {
          return;
        }
      });

      await fetchAPI(
        urlAPI,
        "api/calculate/remaining-goal/",
        "POST",
        bodyRemaining
      ).then((res) => {
        if (res) {
          dailyGoalRemaining.current = res.remaining_goal;
          canNextPage.current = true;
          return;
        } else {
          return;
        }
      });
    }
    if (activatedSection === "2"){
      refreshMeta().then(() => {
        setActivateRefresh(!activateRefresh);
      });
    }
    
  }, [activateRefresh, activatedSection]);

  async function handleOk() {
    formModal.submit();

    const values = await formModal.validateFields();

    if (values?.errorFields?.length > 0) {
      return;
    } else {
      const body = {
        name: values.name,
        kg: values.weight,
      };

      await fetchAPI(urlAPI, "api/persons/", "POST", body)
        .then((res) => {
          if (res.name[0] === "person with this name already exists.") {
            notify.error({
              message: "Erro ao adicionar pessoa!",
              description:
                "Ocorreu um erro ao adicionar a pessoa: Pois já existe uma pessoa com esse nome!",
              placement: "topRight",
              duration: 5,
            });
            return;
          }
          fetchAPI(urlAPI, "api/persons/").then((data) => {
            try {
              if (data.results) {
                setPersons(data.results);
              }
            } catch (err) {
              console.log(err);
              setPersons([]);
            }
          });
          notify.success({
            message: "Pessoa adicionada com sucesso!",
            description: "A pessoa foi adicionada com sucesso!",
            placement: "topRight",
            duration: 3,
          });
          setOpenModal(false);
        })
        .catch((err) => {
          notify.error({
            message: "Erro ao adicionar pessoa!",
            description: "Ocorreu um erro ao adicionar a pessoa: " + err,
            placement: "topRight",
            duration: 3,
          });
          return;
        });
    }
  }

  function handleCancel() {
    setOpenModal(false);
    formModal.resetFields();
  }

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "normal",
        height: "100vh",
        width: "100vw",
        backgroundColor: "#f0f2f5",
      }}
    >
      <Modal
        title="Adicionar Pessoa"
        open={openModal}
        okText="Adicionar"
        onCancel={() => {
          handleCancel();
        }}
        footer={[]}
      >
        <Form form={formModal} name="formModal" layout="vertical">
          <Form.Item
            name="name"
            label="Nome"
            rules={[
              {
                required: true,
                message: "Por favor, digite o nome da pessoa!",
              },
            ]}
          >
            <Input placeholder="Nome" />
          </Form.Item>
          <Form.Item
            name="weight"
            label="Peso"
            rules={[
              {
                required: true,
                message: "Por favor, digite o peso da pessoa!",
              },
            ]}
          >
            <InputNumber
              placeholder="Kg"
              type="number"
              defaultValue={selectedPersonWeight}
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              onClick={() => {
                handleOk();
              }}
            >
              Adicionar
            </Button>
          </Form.Item>
        </Form>
      </Modal>
      {contextHolder}
      <br />
      <br />
      <h1 style={{ color: "black" }} onClick={() => setActivatedSection("1")}>
        Aquamemento
      </h1>
      <br />
      <br />
      {activatedSection === "1" ? (
        <div
          style={{
            backgroundColor: "#f5f6f9",
            width: "50%",
            height: "50%",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "normal",
            borderRadius: 10,
            border: "1px solid #d9d9d9",
          }}
        >
          <Form form={formPerson} name="formPerson">
            <Space align="center">
              <Form.Item
                name="person"
                label="Pessoa"
                rules={[
                  {
                    required: true,
                    message: "Por favor, selecione uma pessoa!",
                  },
                ]}
              >
                <Select
                  style={{ width: 120 }}
                  placeholder="Selecione uma pessoa"
                  onChange={(value) => {
                    handleSelectPeople(value);
                  }}
                >
                  {persons.map((person, index) => {
                    return (
                      <Select.Option key={index} value={person.name}>
                        {person.name}
                      </Select.Option>
                    );
                  })}
                </Select>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setOpenModal(true);
                  }}
                ></Button>
              </Form.Item>
            </Space>
            <Form.Item name="kg" label="Peso">
              <InputNumber
                placeholder="Kg"
                type="number"
                step={0.1}
                min={0}
                disabled
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                onClick={() => {
                  handleNext();
                }}
                disabled={!enableNextButton}
              >
                Próximo
              </Button>
            </Form.Item>
          </Form>
        </div>
      ) : (
        <></>
      )}

      {activatedSection === "2" ? (
        <>
          <div
            style={{
              backgroundColor: "#f5f6f9",
              width: "50%",
              height: "50%",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "normal",
              borderRadius: 10,
              border: "1px solid #d9d9d9",
            }}
          >
            <DatePicker onChange={onChangeDatePickcer} defaultValue={today} />
            <Form form={formConsume} name="formConsume">
              <br />
              <Form.Item
                name="container"
                label="Recipiente"
                rules={[
                  {
                    required: true,
                    message: "Por favor, selecione uma garrafa!",
                  },
                ]}
              >
                <Radio.Group
                  onChange={onChangeContainer}
                  value={valueContainer}
                >
                  <Space direction="vertical">
                    {containers.map((container, index) => {
                      return (
                        <Radio key={index} value={container.capacity}>
                          {container.title} {container.capacity}ml
                        </Radio>
                      );
                    })}
                    <Radio key={100} value={valueRadio}>
                      Adicionar
                      <InputNumber
                        min={0}
                        step={0.1}
                        defaultValue={100.0}
                        onChange={setValueRadio}
                        value={valueRadio}
                        style={{ width: 100, marginLeft: 10 }}
                      />
                    </Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  disabled={!consumeButtonActive}
                  onClick={() => {
                    handleConsume();
                  }}
                >
                  Consumir
                </Button>
              </Form.Item>
            </Form>
          </div>
          <Divider />
          <div
            style={{
              backgroundColor: "#f5f6f9",
              width: "50%",
              height: "100vh",
              padding: 20,
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "normal",
              borderRadius: 10,
              border: "1px solid #d9d9d9",
            }}
          >
            <h2
              style={{
                color: "black",
              }}
            >
              META de {selectedPersonName.toUpperCase()}
            </h2>
            <br />
            <h3
              style={{
                color: "black",
              }}
            >
              Meta diária: {dailyGoal.current}ml
            </h3>
            <h3
              style={{
                color: "black",
              }}
            >
              Consumido: {dailyConsumed.current}ml
            </h3>
            <h3
              style={{
                color: "black",
              }}
            >
              Restante: {dailyGoalRemaining.current}ml
            </h3>
            <h3
              style={{
                color: "black",
              }}
            >
              Porcentagem consumida: {dailyConsumedPercent.current}%
            </h3>
            <br />
            <h2
              style={{
                color: "black",
              }}
            >
              Chegou na meta? {goal.current ? "SIM" : "NÃO"}
            </h2>
            <br />

            <Button type="primary" onClick={() => setActivatedSection("3")}>
              Histórico
            </Button>
          </div>
        </>
      ) : (
        <></>
      )}

      {activatedSection === "3" ? (
        <Form form={formHistory} name="formHistory"></Form>
      ) : (
        <></>
      )}
    </main>
  );
}
